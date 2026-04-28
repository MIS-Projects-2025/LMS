<?php
// routes/web.php


use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LockerCodeController;
use App\Http\Controllers\EmployeeSearchController;

$app_name = env('APP_NAME', '');

Route::redirect('/', "/$app_name");



Route::get('/api/employees/search', [EmployeeSearchController::class, 'search'])->name('employees.search');
Route::get('/api/lockers/available', [LockerCodeController::class, 'available'])->name('lockers.available');

Route::prefix('lockers')->name('lockers.')->group(function () {
    Route::get('/',                 [LockerCodeController::class, 'index'])->name('index');
    Route::post('/',                [LockerCodeController::class, 'store'])->name('store');
    Route::put('/{id}',             [LockerCodeController::class, 'update'])->name('update');
    Route::delete('/{id}',          [LockerCodeController::class, 'destroy'])->name('destroy');
    Route::post('/transfer',        [LockerCodeController::class, 'transfer'])->name('transfer');
    Route::post('/upload',          [LockerCodeController::class, 'upload'])->name('upload');
    Route::get('/export',           [LockerCodeController::class, 'export'])->name('export');
});
