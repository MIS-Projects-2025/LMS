import { useEffect, useState } from "react";
import { Button } from "@/Components/ui/button";
import { Lock } from "lucide-react";

export default function Unauthorized({ message, logoutUrl }) {
    const [seconds, setSeconds] = useState(8);

    useEffect(() => {
        if (seconds <= 0) {
            window.location.href = logoutUrl;
            return;
        }
        const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [seconds, logoutUrl]);

    const percent = ((8 - seconds) / 8) * 100;
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percent / 100) * circumference;

    return (
        <div className="flex items-center justify-center min-h-screen px-6 bg-gray-100 dark:bg-gray-900">
            <div className="text-center">
                {/* SVG circle progress replacing antd <Progress type="circle" /> */}
                <div className="inline-block mb-4">
                    <svg width={120} height={120} viewBox="0 0 120 120">
                        {/* Track */}
                        <circle
                            cx="60"
                            cy="60"
                            r={radius}
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="8"
                        />
                        {/* Progress arc */}
                        <circle
                            cx="60"
                            cy="60"
                            r={radius}
                            fill="none"
                            stroke="#1890ff"
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            transform="rotate(-90 60 60)"
                            style={{
                                transition: "stroke-dashoffset 0.8s ease",
                            }}
                        />
                        {/* Lock icon centered via foreignObject */}
                        <foreignObject x="30" y="30" width="60" height="60">
                            <div className="flex items-center justify-center w-full h-full">
                                <Lock size={36} color="#1890ff" />
                            </div>
                        </foreignObject>
                    </svg>
                </div>

                <h1 className="text-5xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                    Unauthorized
                </h1>
                <p className="text-lg text-gray-500 dark:text-gray-400 mb-2">
                    {message ||
                        "You do not have the necessary authorization to access this system."}
                </p>
                <p className="text-lg text-gray-500 dark:text-gray-400 mb-4">
                    Redirecting to login in{" "}
                    <span className="font-semibold">{seconds}</span> seconds...
                </p>

                {/* shadcn Button replacing antd <Button type="primary" size="large" /> */}
                <Button
                    size="lg"
                    onClick={() => (window.location.href = logoutUrl)}
                >
                    Go Back
                </Button>
            </div>
        </div>
    );
}
