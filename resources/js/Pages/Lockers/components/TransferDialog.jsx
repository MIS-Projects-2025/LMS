import { useEffect } from "react";
import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
import { Button } from "@/Components/ui/button";
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
 * Transfer dialog — move an employee from one locker to another.
 *
 * Props:
 *   open               boolean
 *   onClose            () => void
 *   row                source locker row | null
 *   transferRouteName  route name string  e.g. 'lockers.transfer'
 *   availableApi       string  e.g. '/api/lockers/available'
 */
export default function TransferDialog({
    open,
    onClose,
    row,
    transferRouteName,
    availableApi,
}) {
    const form = useForm({ from_id: "", to_locker_no: "" });

    useEffect(() => {
        if (open && row) {
            form.setData("from_id", row.id);
            form.setData("to_locker_no", "");
        } else {
            form.reset();
        }
    }, [open, row]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadAvailableLockers = async (searchTerm = "") => {
        try {
            const res = await fetch(
                `${availableApi}?search=${encodeURIComponent(searchTerm)}`,
                {
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                    credentials: "same-origin",
                },
            );
            if (!res.ok) throw new Error();
            const data = await res.json();
            return { options: data.options, hasMore: data.hasMore };
        } catch {
            toast.error("Failed to load available lockers");
            return { options: [], hasMore: false };
        }
    };

    function handleSubmit(e) {
        e.preventDefault();
        form.post(route(transferRouteName), {
            onSuccess: () => {
                toast.success("Locker transferred successfully");
                form.reset();
                onClose();
            },
            onError: () => toast.error("Failed to transfer locker"),
        });
    }

    return (
        <Dialog
            open={open}
            onOpenChange={() => { form.reset(); onClose(); }}
        >
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Transfer from Locker {row?.locker_no}</DialogTitle>
                </DialogHeader>

                <p className="text-sm text-muted-foreground">
                    Moving employee <span className="font-semibold">{row?.employ_id}</span> to a
                    different locker.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <Label>Destination Locker <span className="text-destructive">*</span></Label>
                        <Combobox
                            value={form.data.to_locker_no}
                            onChange={(v) => form.setData("to_locker_no", v || "")}
                            placeholder="Select vacant or inactive locker…"
                            loadOptions={loadAvailableLockers}
                            allowCustomValue={false}
                            clearable
                        />
                        {form.errors.to_locker_no && (
                            <p className="text-xs text-destructive">{form.errors.to_locker_no}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? "Transferring…" : "Transfer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
