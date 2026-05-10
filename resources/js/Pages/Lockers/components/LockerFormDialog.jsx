import { useEffect } from "react";
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
import { Combobox } from "@/Components/ui/combobox";

/**
 * Reusable Add / Edit locker dialog.
 *
 * Props:
 *   open          boolean
 *   onClose       () => void
 *   row           null → create mode | object → edit mode
 *   loadEmployees async (search, page) => { options, hasMore }
 *   storeRoute    route name string  e.g. 'lockers.store'
 *   updateRoute   route name string  e.g. 'lockers.update'
 */
export default function LockerFormDialog({
    open,
    onClose,
    row,
    loadEmployees,
    storeRoute,
    updateRoute,
}) {
    const isEdit = !!row;
    const form = useForm({ locker_no: "", employ_id: "", passcode: "", notes: "" });

    // Populate / reset form whenever the dialog opens or the target row changes
    useEffect(() => {
        if (open) {
            form.setData({
                locker_no: row?.locker_no ?? "",
                employ_id: row?.employ_id ?? "",
                passcode:  row?.passcode  ?? "",
                notes:     row?.notes     ?? "",
            });
        } else {
            form.reset();
            form.clearErrors();
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    function handleSubmit(e) {
        e.preventDefault();
        if (isEdit) {
            form.put(route(updateRoute, row.id), {
                onSuccess: () => { toast.success("Locker updated successfully"); onClose(); },
                onError:   () => toast.error("Failed to update locker"),
            });
        } else {
            form.post(route(storeRoute), {
                onSuccess: () => {
                    toast.success("Locker created successfully");
                    form.reset();
                    onClose();
                },
                onError: () => toast.error("Failed to create locker"),
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEdit ? `Edit Locker ${row?.locker_no}` : "Add Locker"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <Label>Locker No {!isEdit && <span className="text-destructive">*</span>}</Label>
                        <Input
                            required={!isEdit}
                            value={form.data.locker_no}
                            onChange={(e) => form.setData("locker_no", e.target.value)}
                        />
                        {form.errors.locker_no && (
                            <p className="text-xs text-destructive">{form.errors.locker_no}</p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <Label>Employee <span className="text-muted-foreground font-normal">(optional)</span></Label>
                        <Combobox
                            value={form.data.employ_id}
                            onChange={(v) => form.setData("employ_id", v || "")}
                            placeholder="Select or search employee…"
                            loadOptions={loadEmployees}
                            allowCustomValue={false}
                            clearable
                        />
                        {form.errors.employ_id && (
                            <p className="text-xs text-destructive">{form.errors.employ_id}</p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <Label>Passcode</Label>
                        <Input
                            value={form.data.passcode}
                            onChange={(e) => form.setData("passcode", e.target.value)}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label>Notes</Label>
                        <Input
                            value={form.data.notes}
                            onChange={(e) => form.setData("notes", e.target.value)}
                        />
                        {form.errors.notes && (
                            <p className="text-xs text-destructive">{form.errors.notes}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? "Saving…" : isEdit ? "Save Changes" : "Save"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
