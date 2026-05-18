import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogAction,
} from "@/Components/ui/alert-dialog";

/**
 * Shows upload validation errors in a ShadCN AlertDialog.
 * Valid rows were already saved; this lists only skipped rows.
 *
 * Props:
 *   errors   string[] | null
 *   onClose  () => void
 */
export default function UploadErrorsAlertDialog({ errors, onClose }) {
    return (
        <AlertDialog open={!!errors?.length}>
            <AlertDialogContent className="max-w-lg">
                <AlertDialogHeader>
                    <AlertDialogTitle>Upload Validation Errors</AlertDialogTitle>
                    <AlertDialogDescription>
                        The following rows were skipped. All valid rows were still saved.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="max-h-60 overflow-y-auto rounded border bg-destructive/5 px-4 py-2 space-y-1">
                    {(errors ?? []).map((err, i) => (
                        <p key={i} className="text-sm text-destructive">
                            {err}
                        </p>
                    ))}
                </div>

                <AlertDialogFooter>
                    <AlertDialogAction onClick={onClose}>OK</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
