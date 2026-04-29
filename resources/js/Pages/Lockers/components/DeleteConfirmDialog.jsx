import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/Components/ui/alert-dialog";

/**
 * ShadCN AlertDialog for delete confirmation.
 *
 * Props:
 *   open      boolean
 *   onClose   () => void
 *   onConfirm () => void
 *   lockerNo  string – displayed in title
 */
export default function DeleteConfirmDialog({ open, onClose, onConfirm, lockerNo }) {
    return (
        <AlertDialog open={open} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Locker {lockerNo}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. The locker record will be permanently removed.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => { onConfirm(); onClose(); }}
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
