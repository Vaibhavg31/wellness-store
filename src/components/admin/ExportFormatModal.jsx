import { FileSpreadsheet, FileText } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

export default function ExportFormatModal({ isOpen, onClose, onSelect, exporting, title = 'Export data' }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <p className="text-sm text-admin-muted mb-5">
                Choose a format for your export. Current filters will be applied.
            </p>
            <div className="grid gap-3">
                <button
                    type="button"
                    disabled={exporting}
                    onClick={() => onSelect('csv')}
                    className="flex items-center gap-4 p-4 rounded-xl border border-admin-border bg-admin-surface-alt hover:bg-admin-surface-alt transition-colors disabled:opacity-50 text-left"
                >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileSpreadsheet size={20} className="text-primary" />
                    </div>
                    <div>
                        <p className="font-medium text-ink">CSV spreadsheet</p>
                        <p className="text-xs text-admin-muted mt-0.5">Best for Excel, Google Sheets, and analysis</p>
                    </div>
                </button>
                <button
                    type="button"
                    disabled={exporting}
                    onClick={() => onSelect('pdf')}
                    className="flex items-center gap-4 p-4 rounded-xl border border-admin-border bg-admin-surface-alt hover:bg-admin-surface-alt transition-colors disabled:opacity-50 text-left"
                >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText size={20} className="text-primary" />
                    </div>
                    <div>
                        <p className="font-medium text-ink">PDF document</p>
                        <p className="text-xs text-admin-muted mt-0.5">Formatted report for sharing or printing</p>
                    </div>
                </button>
            </div>
            <div className="mt-5 flex justify-end">
                <Button variant="outline" size="sm" onClick={onClose} disabled={exporting}>
                    Cancel
                </Button>
            </div>
        </Modal>
    );
}
