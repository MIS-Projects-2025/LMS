<?php

namespace App\Console\Commands;

use App\Models\AdminLockerCode;
use App\Models\LockerCode;
use App\Repositories\EmployeeRepository;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Model;

class SyncLockerStatuses extends Command
{
    protected $signature   = 'lockers:sync-statuses';
    protected $description = 'Sync locker remarks with employee ACCSTATUS from the master list';

    public function __construct(
        protected EmployeeRepository $employees,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $totalUpdated = 0;

        $totalUpdated += $this->syncModel(LockerCode::class, 'locker_codes');
        $totalUpdated += $this->syncModel(AdminLockerCode::class, 'admin_locker_codes');

        $this->info("Sync complete. {$totalUpdated} total locker(s) updated.");

        return self::SUCCESS;
    }

    private function syncModel(string $modelClass, string $label): int
    {
        /** @var Model $modelClass */
        $lockers = $modelClass::whereNotNull('employ_id')
            ->whereNotIn('remarks', [LockerCode::REMARK_VACANT, LockerCode::REMARK_TEMPORARY])
            ->whereRaw('LOWER(employ_id) != ?', ['others'])
            ->get(['id', 'employ_id', 'remarks']);

        if ($lockers->isEmpty()) {
            $this->line("  [{$label}] No records to sync.");
            return 0;
        }

        $ids          = $lockers->pluck('employ_id')->unique()->values()->all();
        $accStatusMap = $this->employees->getAccStatusByIds($ids);

        // Normalize keys to uppercase to avoid case-mismatch between tables
        $accStatusMap = array_change_key_case($accStatusMap, CASE_UPPER);

        $updated = 0;

        foreach ($lockers as $locker) {
            $accStatus  = $accStatusMap[strtoupper($locker->employ_id)] ?? null;
            $newRemarks = $accStatus === 2 ? LockerCode::REMARK_INACTIVE : LockerCode::REMARK_ACTIVE;

            if ($locker->remarks !== $newRemarks) {
                $locker->update(['remarks' => $newRemarks]);
                $updated++;
            }
        }

        $this->line("  [{$label}] {$updated} updated out of {$lockers->count()} checked.");

        return $updated;
    }
}
