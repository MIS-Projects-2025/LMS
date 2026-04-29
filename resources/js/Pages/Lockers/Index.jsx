import LockerPageLayout from "./LockerPageLayout";

const config = {
    title:    "Locker Management",
    subtitle: "Manage locker assignments, transfers, and bulk uploads.",
    routes: {
        index:    "lockers.index",
        store:    "lockers.store",
        update:   "lockers.update",
        destroy:  "lockers.destroy",
        transfer: "lockers.transfer",
        upload:   "lockers.upload",
        export:   "lockers.export",
        template: "lockers.template",
        history:  "lockers.history",
    },
    availableApi: "/api/lockers/available",
};

export default function LockersIndex(props) {
    return <LockerPageLayout {...props} config={config} />;
}
