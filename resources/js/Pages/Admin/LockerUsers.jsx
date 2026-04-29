import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import React, { useState } from "react";
import { usePage, router } from "@inertiajs/react";
import { useForm, Controller } from "react-hook-form";
import { PlusIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/Components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/Components/ui/table";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/Components/ui/sheet";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Combobox } from "@/Components/ui/combobox";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/Components/ui/alert-dialog";
import { toast } from "sonner";

const LockerUsers = () => {
    const { lockerUserList, lockerUserOptions } = usePage().props;
    const [drawerVisible, setDrawerVisible] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm({
        defaultValues: {
            employid: "",
            empname: "",
            department: "",
            prodline: "",
            station: "",
        },
    });

    const availableEmployees = lockerUserOptions.filter(
        (emp) => !lockerUserList.some((a) => a.employid === emp.EMPLOYID),
    );

    const openCreateDrawer = () => {
        reset();
        setDrawerVisible(true);
    };

    const closeDrawer = () => {
        setDrawerVisible(false);
        reset();
    };

    const handleEmployeeChange = (value) => {
        const emp = lockerUserOptions.find((e) => e.EMPLOYID === value);
        if (emp) {
            setValue("employid", emp.EMPLOYID);
            setValue("empname", emp.EMPNAME);
            setValue("department", emp.DEPARTMENT);
            setValue("prodline", emp.PRODLINE);
            setValue("station", emp.STATION);
        }
    };

    const onSubmit = async (data) => {
        try {
            const response = await axios.post(route("lockerUsers.store"), data);
            if (response?.data?.success) {
                toast.success("Locker user created successfully!");
                closeDrawer();
                router.reload({ only: ["lockerUserList"] });
            } else {
                toast.error(response?.data?.message || "Operation failed");
            }
        } catch (error) {
            toast.error("Failed to create locker user. Please try again.");
            console.error(error);
        }
    };

    const handleDelete = async (id) => {
        try {
            const response = await axios.delete(
                route("lockerUsers.destroy", id),
            );
            if (response?.data?.success) {
                toast.success("Locker user deleted successfully!");
                router.reload({ only: ["lockerUserList"] });
            } else {
                toast.error(response?.data?.message || "Delete failed");
            }
        } catch (error) {
            toast.error("Failed to delete locker user. Please try again.");
            console.error(error);
        }
    };

    return (
        <AuthenticatedLayout>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Locker Users</CardTitle>
                    <Button
                        onClick={openCreateDrawer}
                        disabled={availableEmployees.length === 0}
                    >
                        <PlusIcon className="mr-2 h-4 w-4" />
                        Add New Locker User
                    </Button>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Employee ID</TableHead>
                                <TableHead>Employee Name</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Product Line</TableHead>
                                <TableHead>Station</TableHead>
                                <TableHead>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lockerUserList.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="text-center text-muted-foreground"
                                    >
                                        No locker user data available
                                    </TableCell>
                                </TableRow>
                            ) : (
                                lockerUserList.map((record) => (
                                    <TableRow key={record.id}>
                                        <TableCell>{record.id}</TableCell>
                                        <TableCell>{record.employid}</TableCell>
                                        <TableCell>{record.empname}</TableCell>
                                        <TableCell>
                                            {record.department}
                                        </TableCell>
                                        <TableCell>{record.prodline}</TableCell>
                                        <TableCell>{record.station}</TableCell>
                                        <TableCell>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2Icon className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>
                                                            Delete Locker User
                                                        </AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Are you sure you
                                                            want to delete this
                                                            user?
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>
                                                            No
                                                        </AlertDialogCancel>
                                                        <AlertDialogAction
                                                            onClick={() =>
                                                                handleDelete(
                                                                    record.id,
                                                                )
                                                            }
                                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                        >
                                                            Yes
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Sheet
                open={drawerVisible}
                onOpenChange={(open) => !open && closeDrawer()}
            >
                <SheetContent className="w-[400px]">
                    <SheetHeader>
                        <SheetTitle>Add New Locker User</SheetTitle>
                    </SheetHeader>

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="mt-6 space-y-4"
                    >
                        <div className="space-y-1">
                            <Label>Employee</Label>
                            <Controller
                                control={control}
                                name="employid"
                                rules={{
                                    required: "Please select an employee",
                                }}
                                render={({ field }) => (
                                    <Combobox
                                        options={availableEmployees.map(
                                            (emp) => ({
                                                value: emp.EMPLOYID,
                                                label: `${emp.EMPLOYID} - ${emp.EMPNAME}`,
                                            }),
                                        )}
                                        value={field.value}
                                        onChange={(value) => {
                                            field.onChange(value ?? "");
                                            if (value)
                                                handleEmployeeChange(value);
                                        }}
                                        placeholder="Select Employee"
                                        clearable={true}
                                        allowCustomValue={false}
                                    />
                                )}
                            />
                            {errors.employid && (
                                <p className="text-sm text-destructive">
                                    {errors.employid.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <Label>Department</Label>
                            <Controller
                                control={control}
                                name="department"
                                render={({ field }) => (
                                    <Input readOnly {...field} />
                                )}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>Product Line</Label>
                            <Controller
                                control={control}
                                name="prodline"
                                render={({ field }) => (
                                    <Input readOnly {...field} />
                                )}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>Station</Label>
                            <Controller
                                control={control}
                                name="station"
                                render={({ field }) => (
                                    <Input readOnly {...field} />
                                )}
                            />
                        </div>

                        <Button type="submit" className="w-full">
                            Add
                        </Button>
                    </form>
                </SheetContent>
            </Sheet>
        </AuthenticatedLayout>
    );
};

export default LockerUsers;
