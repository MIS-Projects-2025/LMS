import LockerPageLayout from "./LockerPageLayout";

const config = {
    title:    "Admin Locker Management",
    subtitle: "Manage admin locker assignments, transfers, and bulk uploads.",
    routes: {
        index:    "admin-lockers.index",
        store:    "admin-lockers.store",
        update:   "admin-lockers.update",
        destroy:  "admin-lockers.destroy",
        transfer: "admin-lockers.transfer",
        upload:   "admin-lockers.upload",
        export:   "admin-lockers.export",
        template: "admin-lockers.template",
        history:  "admin-lockers.history",
    },
    availableApi: "/api/admin-lockers/available",
};

export default function AdminLockersIndex(props) {
    return <LockerPageLayout {...props} config={config} />;
}
