/** Deep-merge `source` into `target` (mutates target). Arrays from source replace target arrays. */
export function deepMerge(target, source) {
    if (!source || typeof source !== 'object') return target;
    if (!target || typeof target !== 'object') return source;

    const output = Array.isArray(target) ? [...target] : { ...target };

    Object.keys(source).forEach((key) => {
        const srcVal = source[key];
        const tgtVal = output[key];

        if (srcVal === undefined) {
            return;
        }

        if (Array.isArray(srcVal)) {
            output[key] = [...srcVal];
        } else if (srcVal !== null && typeof srcVal === 'object') {
            output[key] = deepMerge(
                tgtVal && typeof tgtVal === 'object' && !Array.isArray(tgtVal) ? tgtVal : {},
                srcVal,
            );
        } else {
            output[key] = srcVal;
        }
    });

    return output;
}
