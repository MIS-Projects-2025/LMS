<?php

use App\Http\Controllers\LockerUsersController;
use Illuminate\Support\Facades\Route;

$app_name = $app_name ?? env('APP_NAME', 'app');
// dd($app_name);
Route::prefix($app_name)

    ->group(function () {

    

        Route::get('/lockerUsers', [LockerUsersController::class, 'index'])->name('lockerUsers.form');
        Route::post('/lockerUsers', [LockerUsersController::class, 'store'])->name('lockerUsers.store');
        Route::delete('/lockerUsers/{id}', [LockerUsersController::class, 'destroy'])->name('lockerUsers.destroy');
    });
