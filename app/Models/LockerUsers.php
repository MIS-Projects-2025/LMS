<?php

namespace App\Models;

use App\Traits\Loggable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LockerUsers extends Model
{
    use Loggable;
    use HasFactory;

    protected $table = 'locker_users';

    public $timestamps = false;

    protected $fillable = [
        'employid',
        'empname',
        'department',
        'prodline',
        'station',
        'created_by',
        'created_at',
        'updated_by',
        'updated_at',
    ];
}
