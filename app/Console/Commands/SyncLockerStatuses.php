<?php

namespace App\Console\Commands;

use App\Models\LockerCode;
use App\Repositories\EmployeeRepository;
use App\Repositories\LockerCodeRepository;
use Illuminate\Console\Command;

class SyncLockerStatuses extends Command
{
    protected $signature   = 'lockers:sync-statuses';
    protected $description = 'Sync locker remarks with employee ACCSTATUS from the master list';

    public function __construct(
        protected LockerCodeRepository $repo,
        protected EmployeeRepository   $employees,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        // Only lockers tied to a real employee (not vacant, not "others"/temporary)
        $lockers = LockerCode::whereNotNull('employ_id')
            ->whereNotIn('remarks', [LockerCode::REMARK_VACANT, LockerCode::REMARK_TEMPORARY])
            ->whereRaw('LOWER(employ_id) != ?', ['others'])
            ->get(['id', 'employ_id', 'remarks']);

        if ($lockers->isEmpty()) {
            $this->info('No locker records to sync.');
            return self::SUCCESS;
        }

        $ids          = $lockers->pluck('employ_id')->unique()->values()->all();
        $accStatusMap = $this->employees->getAccStatusByIds($ids);

        $updated = 0;

        foreach ($lockers as $locker) {
            $accStatus   = $accStatusMap[$locker->employ_id] ?? null;
            $newRemarks  = $accStatus === 2 ? LockerCode::REMARK_INACTIVE : LockerCode::REMARK_ACTIVE;

            if ($locker->remarks !== $newRemarks) {
                $this->repo->update($locker->id, ['remarks' => $newRemarks]);
                $updated++;
            }
        }

        $this->info("Sync complete. {$updated} locker(s) updated out of {$lockers->count()} checked.");

        return self::SUCCESS;
    }
}
