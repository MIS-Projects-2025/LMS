import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/Components/ui/dialog";

/**
 * Bulk Excel upload dialog.
 *
 * Props:
 *   open               boolean
 *   onClose            () => void
 *   uploadRouteName    route name string  e.g. 'lockers.upload'
 *   templateRouteName  route name string  e.g. 'lockers.template'
 */
export default function UploadDialog({
    open,
    onClose,
    uploadRouteName,
    templateRouteName,
}) {
    const form = useForm({ file: null });

    function handleSubmit(e) {
        e.preventDefault();
        form.post(route(uploadRouteName), {
            forceFormData: true,
            onSuccess: () => { form.reset(); onClose(); },
            onError:   () => toast.error("Failed to upload file"),
        });
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Bulk Upload Excel</DialogTitle>
                </DialogHeader>

                <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm space-y-1">
                    <p className="font-medium">Required columns</p>
                    <p className="text-muted-foreground">
                        <code className="rounded bg-muted px-1 py-0.5 text-xs">Locker Number</code>{" "}
                        <code className="rounded bg-muted px-1 py-0.5 text-xs">Emp No</code>{" "}
                        <code className="rounded bg-muted px-1 py-0.5 text-xs">Passcode</code>
                    </p>
                    <p className="text-muted-foreground text-xs">
                        Status is auto-generated from the employee masterlist.{" "}
                        <a
                            href={route(templateRouteName)}
                            className="underline font-medium"
                        >
                            Download template
                        </a>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <Label>Excel File <span className="text-destructive">*</span></Label>
                        <Input
                            required
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) => form.setData("file", e.target.files[0])}
                            className="text-sm"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? "Uploading…" : "Upload"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
