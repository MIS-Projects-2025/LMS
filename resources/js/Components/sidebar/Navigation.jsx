import { usePage } from "@inertiajs/react";
import SidebarLink from "@/Components/sidebar/SidebarLink";
import Dropdown from "@/Components/sidebar/DropDown";
import { LayoutDashboard, LockIcon, User } from "lucide-react";

export default function NavLinks({ isSidebarOpen }) {
    const { emp_data } = usePage().props;

    return (
        <nav
            className="flex flex-col flex-grow space-y-1 overflow-y-auto"
            style={{ scrollbarWidth: "none" }}
        >
            <SidebarLink
                href={route("lockerUsers.form")}
                label="Users"
                icon={<User className="w-5 h-5" />}
                isSidebarOpen={isSidebarOpen}
            />
            <Dropdown
                label="Lockers"
                icon={<LockIcon className="w-[18px] h-[18px]" />}
                isSidebarOpen={isSidebarOpen}
                links={[
                    { href: route("lockers.index"),       label: "All Lockers" },
                    { href: route("admin-lockers.index"), label: "Admin Lockers" },
                ]}
            />
        </nav>
    );
}
