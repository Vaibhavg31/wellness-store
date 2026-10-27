#!/usr/bin/env bash
# One-time AWS setup for Chikit: ECS (EC2, free-tier sized) + RDS MySQL + ECR + GitHub OIDC deploy role.
# Safe to re-run: every step checks whether the resource already exists first.
#
#   aws login            # or `aws configure` / SSO — any way that makes `aws sts get-caller-identity` work
#   bash infra/aws/setup.sh
#
# Optional overrides:  REGION=ap-south-1  GITHUB_REPO=Vaibhavg31/wellness-store  GITHUB_BRANCH=master
set -euo pipefail
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*'   # Git Bash on Windows must not rewrite "/aws/..." style arguments
export AWS_PAGER=""

REGION="${REGION:-ap-south-1}"
GITHUB_REPO="${GITHUB_REPO:-Vaibhavg31/wellness-store}"
GITHUB_BRANCH="${GITHUB_BRANCH:-master}"
APP=chikit
export AWS_DEFAULT_REGION="$REGION"

step() { printf '\n\033[1;35m== %s\033[0m\n' "$*"; }
note() { printf '   %s\n' "$*"; }
exists() { "$@" >/dev/null 2>&1; }
here="$(cd "$(dirname "$0")" && pwd)"
root="$(cd "$here/../.." && pwd)"

step "Checking AWS access"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)" || { echo "No AWS credentials. Run 'aws login' (or 'aws configure') first."; exit 1; }
note "Account $ACCOUNT_ID, region $REGION"

BUCKET="$APP-config-$ACCOUNT_ID"
EXEC_ROLE="$APP-ecs-task-execution"
INSTANCE_ROLE="$APP-ecs-instance"
GH_ROLE="$APP-github-deploy"
STATE_DIR="$HOME/.chikit-aws"; mkdir -p "$STATE_DIR"

# ---------------------------------------------------------------------------------------------------------------
step "Network (default VPC)"
VPC_ID="$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)"
[ "$VPC_ID" != "None" ] || { echo "No default VPC in $REGION. Create one with: aws ec2 create-default-vpc"; exit 1; }
SUBNETS="$(aws ec2 describe-subnets --filters Name=vpc-id,Values="$VPC_ID" Name=default-for-az,Values=true --query 'Subnets[].SubnetId' --output text)"
FIRST_SUBNET="$(echo "$SUBNETS" | awk '{print $1}')"
note "VPC $VPC_ID, subnets: $SUBNETS"

sg_id() { aws ec2 describe-security-groups --filters Name=group-name,Values="$1" Name=vpc-id,Values="$VPC_ID" --query 'SecurityGroups[0].GroupId' --output text; }
WEB_SG="$(sg_id $APP-web)"
if [ "$WEB_SG" = "None" ]; then
  WEB_SG="$(aws ec2 create-security-group --group-name $APP-web --description 'Chikit web (HTTP/HTTPS)' --vpc-id "$VPC_ID" --query GroupId --output text)"
  aws ec2 authorize-security-group-ingress --group-id "$WEB_SG" --ip-permissions \
    'IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0}]' \
    'IpProtocol=tcp,FromPort=443,ToPort=443,IpRanges=[{CidrIp=0.0.0.0/0}]' >/dev/null
fi
DB_SG="$(sg_id $APP-db)"
if [ "$DB_SG" = "None" ]; then
  DB_SG="$(aws ec2 create-security-group --group-name $APP-db --description 'Chikit MySQL (only from the web instance)' --vpc-id "$VPC_ID" --query GroupId --output text)"
  aws ec2 authorize-security-group-ingress --group-id "$DB_SG" --protocol tcp --port 3306 --source-group "$WEB_SG" >/dev/null
fi
note "Security groups: web=$WEB_SG db=$DB_SG"

# ---------------------------------------------------------------------------------------------------------------
step "IAM roles"
aws iam create-service-linked-role --aws-service-name ecs.amazonaws.com >/dev/null 2>&1 || true

ec2_trust='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
tasks_trust='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

if ! exists aws iam get-role --role-name "$INSTANCE_ROLE"; then
  aws iam create-role --role-name "$INSTANCE_ROLE" --assume-role-policy-document "$ec2_trust" >/dev/null
  aws iam attach-role-policy --role-name "$INSTANCE_ROLE" --policy-arn arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role
  aws iam attach-role-policy --role-name "$INSTANCE_ROLE" --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
fi
if ! exists aws iam get-instance-profile --instance-profile-name "$INSTANCE_ROLE"; then
  aws iam create-instance-profile --instance-profile-name "$INSTANCE_ROLE" >/dev/null
  aws iam add-role-to-instance-profile --instance-profile-name "$INSTANCE_ROLE" --role-name "$INSTANCE_ROLE"
  note "waiting for the instance profile to propagate…"; sleep 15
fi

if ! exists aws iam get-role --role-name "$EXEC_ROLE"; then
  aws iam create-role --role-name "$EXEC_ROLE" --assume-role-policy-document "$tasks_trust" >/dev/null
  aws iam attach-role-policy --role-name "$EXEC_ROLE" --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
fi
aws iam put-role-policy --role-name "$EXEC_ROLE" --policy-name read-config-file --policy-document "{
  \"Version\":\"2012-10-17\",\"Statement\":[
    {\"Effect\":\"Allow\",\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::$BUCKET/prod.env\"},
    {\"Effect\":\"Allow\",\"Action\":\"s3:GetBucketLocation\",\"Resource\":\"arn:aws:s3:::$BUCKET\"}]}"
note "roles ready: $INSTANCE_ROLE, $EXEC_ROLE"

# ---------------------------------------------------------------------------------------------------------------
step "ECR repository (Docker images)"
if ! exists aws ecr describe-repositories --repository-names $APP; then
  aws ecr create-repository --repository-name $APP --image-scanning-configuration scanOnPush=true >/dev/null
fi
# Free tier gives 500 MB of image storage: keep only the 8 newest images.
aws ecr put-lifecycle-policy --repository-name $APP --lifecycle-policy-text '{"rules":[{"rulePriority":1,"description":"keep last 8","selection":{"tagStatus":"any","countType":"imageCountMoreThan","countNumber":8},"action":{"type":"expire"}}]}' >/dev/null
note "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$APP"

step "Private config bucket (holds the production settings file)"
if ! exists aws s3api head-bucket --bucket "$BUCKET"; then
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" --create-bucket-configuration LocationConstraint="$REGION" >/dev/null
fi
aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-encryption --bucket "$BUCKET" --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# Existing settings (if this is a re-run) so passwords are never regenerated under a live database.
ENV_FILE="$STATE_DIR/prod.env"
if aws s3 cp "s3://$BUCKET/prod.env" "$ENV_FILE" >/dev/null 2>&1; then note "found existing prod.env — keeping its secrets"; else rm -f "$ENV_FILE"; fi
getenv() { [ -f "$ENV_FILE" ] && grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2- || true; }
randpw() { node -e "console.log(require('crypto').randomBytes(24).toString('base64').replace(/[^A-Za-z0-9]/g,'').slice(0,28))"; }

DB_PASS="$(getenv DB_PASS)"; [ -n "$DB_PASS" ] || DB_PASS="$(randpw)"
JWT_SECRET="$(getenv JWT_SECRET)"; [ -n "$JWT_SECRET" ] || JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
ADMIN_HASH="$(getenv ADMIN_PASSWORD_HASH)"
if [ -z "$ADMIN_HASH" ]; then
  ADMIN_PLAIN="$(randpw)"
  ADMIN_HASH="$(cd "$root/backend-node" && ADMIN_PLAIN="$ADMIN_PLAIN" node -e "import('bcryptjs').then(b=>console.log((b.default||b).hashSync(process.env.ADMIN_PLAIN,10)))")"
  printf 'Chikit Studio login\nusername: chikit_admin\npassword: %s\n' "$ADMIN_PLAIN" > "$HOME/chikit-admin-login.txt"
  note "admin password saved to $HOME/chikit-admin-login.txt (outside the repo)"
fi

# ---------------------------------------------------------------------------------------------------------------
step "MySQL on RDS (db.t3.micro, 20 GB)"
if ! exists aws rds describe-db-subnet-groups --db-subnet-group-name $APP; then
  # shellcheck disable=SC2086
  aws rds create-db-subnet-group --db-subnet-group-name $APP --db-subnet-group-description "Chikit" --subnet-ids $SUBNETS >/dev/null
fi
if ! exists aws rds describe-db-instances --db-instance-identifier $APP-db; then
  aws rds create-db-instance --db-instance-identifier $APP-db \
    --engine mysql --db-instance-class db.t3.micro \
    --allocated-storage 20 --storage-type gp2 --no-multi-az --no-publicly-accessible \
    --master-username chikit --master-user-password "$DB_PASS" --db-name wellness_store \
    --db-subnet-group-name $APP --vpc-security-group-ids "$DB_SG" \
    --backup-retention-period 7 --deletion-protection >/dev/null
  note "creating — this takes about 10 minutes…"
fi
aws rds wait db-instance-available --db-instance-identifier $APP-db
DB_HOST="$(aws rds describe-db-instances --db-instance-identifier $APP-db --query 'DBInstances[0].Endpoint.Address' --output text)"
note "database at $DB_HOST"

# ---------------------------------------------------------------------------------------------------------------
step "EC2 host for ECS (t3.micro) + fixed public IP"
aws logs create-log-group --log-group-name /ecs/$APP >/dev/null 2>&1 || true
aws logs put-retention-policy --log-group-name /ecs/$APP --retention-in-days 14
CLUSTER_STATUS="$(aws ecs describe-clusters --clusters $APP --query 'clusters[0].status' --output text 2>/dev/null || echo MISSING)"
[ "$CLUSTER_STATUS" = "ACTIVE" ] || aws ecs create-cluster --cluster-name $APP >/dev/null

INSTANCE_ID="$(aws ec2 describe-instances --filters Name=tag:Name,Values=$APP-ecs Name=instance-state-name,Values=pending,running,stopped --query 'Reservations[0].Instances[0].InstanceId' --output text)"
if [ "$INSTANCE_ID" = "None" ]; then
  AMI="$(aws ssm get-parameter --name /aws/service/ecs/optimized-ami/amazon-linux-2023/recommended/image_id --query Parameter.Value --output text)"
  ITYPE="$(aws ec2 describe-instance-types --filters Name=free-tier-eligible,Values=true Name=processor-info.supported-architecture,Values=x86_64 --query 'InstanceTypes[].InstanceType' --output text | tr '\t' '\n' | grep -E '^t3\.micro$|^t2\.micro$' | head -1)"
  ITYPE="${ITYPE:-t3.micro}"
  USER_DATA="$(printf '#!/bin/bash\necho "ECS_CLUSTER=%s" >> /etc/ecs/ecs.config\nmkdir -p /opt/chikit/uploads\nchown 1000:1000 /opt/chikit/uploads\n' "$APP")"
  INSTANCE_ID="$(aws ec2 run-instances --image-id "$AMI" --instance-type "$ITYPE" --subnet-id "$FIRST_SUBNET" \
    --security-group-ids "$WEB_SG" --iam-instance-profile Name=$INSTANCE_ROLE \
    --metadata-options HttpTokens=required,HttpPutResponseHopLimit=2 \
    --block-device-mappings 'DeviceName=/dev/xvda,Ebs={VolumeSize=30,VolumeType=gp3,DeleteOnTermination=true}' \
    --associate-public-ip-address --user-data "$USER_DATA" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$APP-ecs}]" \
    --query 'Instances[0].InstanceId' --output text)"
  note "launched $INSTANCE_ID ($ITYPE)"
fi
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"

ALLOC_ID="$(aws ec2 describe-addresses --filters Name=tag:Name,Values=$APP-ip --query 'Addresses[0].AllocationId' --output text)"
if [ "$ALLOC_ID" = "None" ]; then
  ALLOC_ID="$(aws ec2 allocate-address --domain vpc --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=$APP-ip}]" --query AllocationId --output text)"
fi
aws ec2 associate-address --instance-id "$INSTANCE_ID" --allocation-id "$ALLOC_ID" --allow-reassociation >/dev/null
PUBLIC_IP="$(aws ec2 describe-addresses --allocation-ids "$ALLOC_ID" --query 'Addresses[0].PublicIp' --output text)"
note "site address: http://$PUBLIC_IP"

# ---------------------------------------------------------------------------------------------------------------
step "Production settings file (s3://$BUCKET/prod.env)"
SITE_URL="$(getenv FRONTEND_URL)"; [ -n "$SITE_URL" ] || SITE_URL="http://$PUBLIC_IP"
{
  echo "APP_ENV=production"
  echo "DB_HOST=$DB_HOST"
  echo "DB_PORT=3306"
  echo "DB_NAME=wellness_store"
  echo "DB_USER=chikit"
  echo "DB_PASS=$DB_PASS"
  echo "JWT_SECRET=$JWT_SECRET"
  echo "ADMIN_PASSWORD_HASH=$ADMIN_HASH"
  echo "FRONTEND_URL=$SITE_URL"
  # Keep anything a person added by hand later (Razorpay, Brevo, MSG91, Google…) when this script is re-run.
  if [ -f "$ENV_FILE" ]; then
    grep -vE '^(APP_ENV|DB_HOST|DB_PORT|DB_NAME|DB_USER|DB_PASS|JWT_SECRET|ADMIN_PASSWORD_HASH|FRONTEND_URL)=' "$ENV_FILE" || true
  fi
} > "$ENV_FILE.new"
mv "$ENV_FILE.new" "$ENV_FILE"
aws s3 cp "$ENV_FILE" "s3://$BUCKET/prod.env" --sse AES256 >/dev/null
note "uploaded (a local copy is kept in $ENV_FILE — keep it private)"

# ---------------------------------------------------------------------------------------------------------------
step "GitHub → AWS trust (OIDC, no stored keys) for $GITHUB_REPO@$GITHUB_BRANCH"
OIDC_ARN="arn:aws:iam::$ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
if ! exists aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_ARN"; then
  aws iam create-open-id-connect-provider --url https://token.actions.githubusercontent.com --client-id-list sts.amazonaws.com \
    --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 >/dev/null
fi
GH_TRUST="{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Federated\":\"$OIDC_ARN\"},\"Action\":\"sts:AssumeRoleWithWebIdentity\",\"Condition\":{\"StringEquals\":{\"token.actions.githubusercontent.com:aud\":\"sts.amazonaws.com\",\"token.actions.githubusercontent.com:sub\":\"repo:$GITHUB_REPO:ref:refs/heads/$GITHUB_BRANCH\"}}}]}"
if exists aws iam get-role --role-name "$GH_ROLE"; then
  aws iam update-assume-role-policy --role-name "$GH_ROLE" --policy-document "$GH_TRUST"
else
  aws iam create-role --role-name "$GH_ROLE" --assume-role-policy-document "$GH_TRUST" >/dev/null
fi
aws iam put-role-policy --role-name "$GH_ROLE" --policy-name deploy-chikit --policy-document "{
  \"Version\":\"2012-10-17\",\"Statement\":[
    {\"Sid\":\"EcrLogin\",\"Effect\":\"Allow\",\"Action\":\"ecr:GetAuthorizationToken\",\"Resource\":\"*\"},
    {\"Sid\":\"EcrPush\",\"Effect\":\"Allow\",\"Action\":[\"ecr:BatchCheckLayerAvailability\",\"ecr:InitiateLayerUpload\",\"ecr:UploadLayerPart\",\"ecr:CompleteLayerUpload\",\"ecr:PutImage\",\"ecr:BatchGetImage\",\"ecr:GetDownloadUrlForLayer\"],\"Resource\":\"arn:aws:ecr:$REGION:$ACCOUNT_ID:repository/$APP\"},
    {\"Sid\":\"EcsTaskDefs\",\"Effect\":\"Allow\",\"Action\":[\"ecs:RegisterTaskDefinition\",\"ecs:DescribeTaskDefinition\"],\"Resource\":\"*\"},
    {\"Sid\":\"EcsDeploy\",\"Effect\":\"Allow\",\"Action\":[\"ecs:DescribeServices\",\"ecs:CreateService\",\"ecs:UpdateService\",\"ecs:RunTask\",\"ecs:DescribeTasks\",\"ecs:ListTasks\"],\"Resource\":[\"arn:aws:ecs:$REGION:$ACCOUNT_ID:service/$APP/*\",\"arn:aws:ecs:$REGION:$ACCOUNT_ID:task/$APP/*\",\"arn:aws:ecs:$REGION:$ACCOUNT_ID:task-definition/$APP:*\",\"arn:aws:ecs:$REGION:$ACCOUNT_ID:cluster/$APP\"]},
    {\"Sid\":\"PassExecRole\",\"Effect\":\"Allow\",\"Action\":\"iam:PassRole\",\"Resource\":\"arn:aws:iam::$ACCOUNT_ID:role/$EXEC_ROLE\",\"Condition\":{\"StringEquals\":{\"iam:PassedToService\":\"ecs-tasks.amazonaws.com\"}}}]}"
GH_ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$GH_ROLE"

# ---------------------------------------------------------------------------------------------------------------
cat <<EOF

$(printf '\033[1;32m')All AWS pieces are ready.$(printf '\033[0m')

Last step — in GitHub: repo $GITHUB_REPO → Settings → Secrets and variables → Actions → Variables → New repository variable:

    AWS_ROLE_ARN     = $GH_ROLE_ARN
    AWS_REGION       = $REGION
    AWS_ACCOUNT_ID   = $ACCOUNT_ID
    CONFIG_BUCKET    = $BUCKET
    VITE_SITE_URL    = $SITE_URL        (change to your https domain once you have one)

Then push to $GITHUB_BRANCH (or run the "Deploy to AWS" workflow). The first run also loads the starter database.
The site will be at: http://$PUBLIC_IP
Studio login details: $HOME/chikit-admin-login.txt (delete it after you've saved the password somewhere safe)
EOF
