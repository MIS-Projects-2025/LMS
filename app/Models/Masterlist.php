<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Masterlist extends Model
{
    protected $connection = 'masterlist';
    protected $table = 'employee_masterlist';
    protected $primaryKey = 'EMPID';
    public $timestamps = false;

    protected $fillable = [
        'EMPID',
        'EMPLOYID',

    ];
}
