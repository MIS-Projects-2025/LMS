<?php

namespace App\Models;

use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class AdminLockerCode extends Model
{
    use Loggable;
    protected $table = 'admin_locker_codes';

    protected $fillable = [
        'locker_no',
        'employ_id',
        'passcode',
        'remarks',
        'notes',
        'created_by',
    ];

    public $timestamps = true; // uses created_at; add updated_at if needed

    protected $casts = [
        'remarks' => 'integer',
    ];

    // ─── Remarks Constants ────────────────────────────────────────────────────

    const REMARK_ACTIVE     = 1;
    const REMARK_VACANT     = 2;
    const REMARK_INACTIVE   = 3;
    const REMARK_TEMPORARY  = 4;

    const REMARKS = [
        self::REMARK_ACTIVE,
        self::REMARK_VACANT,
        self::REMARK_INACTIVE,
        self::REMARK_TEMPORARY,
    ];

    const REMARK_LABELS = [
        self::REMARK_ACTIVE    => 'Active',
        self::REMARK_VACANT    => 'Vacant',
        self::REMARK_INACTIVE  => 'Inactive',
        self::REMARK_TEMPORARY => 'Temporary',
    ];

    // Maps user-typed status text (case-insensitive) → int value
    const STATUS_MAP = [
        'active'    => self::REMARK_ACTIVE,
        'vacant'    => self::REMARK_VACANT,
        'inactive'  => self::REMARK_INACTIVE,
        'temporary' => self::REMARK_TEMPORARY,
        'others'    => self::REMARK_TEMPORARY,
    ];

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('remarks', self::REMARK_ACTIVE);
    }

    public function scopeVacant(Builder $query): Builder
    {
        return $query->where('remarks', self::REMARK_VACANT);
    }

    public function scopeInactive(Builder $query): Builder
    {
        return $query->where('remarks', self::REMARK_INACTIVE);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    public function isVacant(): bool
    {
        return $this->remarks === self::REMARK_VACANT;
    }

    public function isActive(): bool
    {
        return $this->remarks === self::REMARK_ACTIVE;
    }

    public function isInactive(): bool
    {
        return $this->remarks === self::REMARK_INACTIVE;
    }

    public function isTemporary(): bool
    {
        return $this->remarks === self::REMARK_TEMPORARY;
    }

    public function getRemarkLabelAttribute(): string
    {
        return self::REMARK_LABELS[$this->remarks] ?? '';
    }
}
