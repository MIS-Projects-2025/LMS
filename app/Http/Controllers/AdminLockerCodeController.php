<?php

namespace App\Http\Controllers;

use App\Models\AdminLockerCode;
use App\Services\AdminLockerCodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminLockerCodeController extends Controller
{
    public function __construct(protected AdminLockerCodeService $service) {}

    public function index(Request $request): InertiaResponse
    {
        $filters = $request->only(['search', 'remarks', 'sort_by', 'sort_dir']);
        $perPage = (int) $request->get('per_page', 10);

        $lockers = $this->service->list($filters, $perPage);

        return Inertia::render('Lockers/AdminIndex', [
            'lockers'       => $lockers,
            'filters'       => array_merge($filters, ['per_page' => $perPage]),
            'remarkOptions' => collect(AdminLockerCode::REMARK_LABELS)
                ->map(fn($label, $value) => ['value' => $value, 'label' => $label])
                ->values(),
            'statusCounts'  => $this->service->countByRemarks(),
            'upload_result' => session('upload_result'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'locker_no' => ['required', 'string', 'max:100'],
            'employ_id' => ['nullable', 'string', 'max:50'],
            'passcode'  => ['nullable', 'string', 'max:50'],
            'notes'     => ['nullable', 'string', 'max:255'],
        ]);

        $this->service->create($data);

        return back()->with('success', 'Admin locker created successfully.');
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $data = $request->validate([
            'locker_no' => ['sometimes', 'string', 'max:100'],
            'employ_id' => ['nullable', 'string', 'max:50'],
            'passcode'  => ['nullable', 'string', 'max:50'],
            'notes'     => ['nullable', 'string', 'max:255'],
        ]);

        $this->service->edit($id, $data);

        return back()->with('success', 'Admin locker updated successfully.');
    }

    public function destroy(int $id): RedirectResponse
    {
        $this->service->delete($id);

        return back()->with('success', 'Admin locker deleted.');
    }

    public function transfer(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'from_id'      => ['required', 'integer', 'exists:admin_locker_codes,id'],
            'to_locker_no' => ['required', 'string', 'exists:admin_locker_codes,locker_no'],
        ]);

        $result = $this->service->transfer($data['from_id'], $data['to_locker_no']);

        return back()->with('success', "Transferred from locker {$result['from']->locker_no} to {$result['to']->locker_no}.");
    }

    public function upload(Request $request): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:10240'],
        ]);

        $rows   = $this->parseExcel($request->file('file'));
        $result = $this->service->upload($rows);

        return redirect()->route('admin-lockers.index')->with('upload_result', [
            'success_count' => $result['counts']['created'] + $result['counts']['updated'],
            'created_count' => $result['counts']['created'],
            'updated_count' => $result['counts']['updated'],
            'errors'        => $result['errors'],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $records     = $this->service->export($request->only(['remarks']));
        $spreadsheet = new Spreadsheet();
        $sheet       = $spreadsheet->getActiveSheet();

        $sheet->fromArray(
            ['Locker Number', 'Emp No', 'Passcode', 'Status', 'Notes'],
            null,
            'A1'
        );

        $row = 2;
        foreach ($records as $r) {
            $sheet->fromArray([
                $r->locker_no,
                $r->employ_id ?? '',
                $r->passcode  ?? '',
                AdminLockerCode::REMARK_LABELS[$r->remarks] ?? '',
                $r->notes     ?? '',
            ], null, "A{$row}");
            $row++;
        }

        $writer   = new Xlsx($spreadsheet);
        $suffix = '';
        if (!empty($filters['remarks'])) {
            $label  = AdminLockerCode::REMARK_LABELS[$filters['remarks']] ?? 'filtered';
            $suffix = '_' . strtolower($label);
        }

        $filename = 'lockers' . $suffix . '_' . now()->format('Ymd_His') . '.xlsx';

        return response()->streamDownload(
            fn() => $writer->save('php://output'),
            $filename,
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
        );
    }

    public function template(): StreamedResponse
    {
        $spreadsheet = new Spreadsheet();
        $sheet       = $spreadsheet->getActiveSheet();

        $sheet->fromArray(['Locker Number', 'Emp No', 'Passcode', 'Notes'], null, 'A1');

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(
            fn() => $writer->save('php://output'),
            'admin_lockers_template.xlsx',
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
        );
    }

    public function available(Request $request): JsonResponse
    {
        $search  = $request->input('search') ?? '';
        $lockers = $this->service->availableLockers($search);

        $options = $lockers->map(fn($l) => [
            'value' => $l->locker_no,
            'label' => $l->locker_no . ' (' . AdminLockerCode::REMARK_LABELS[$l->remarks] . ')',
        ]);

        return response()->json([
            'options' => $options,
            'hasMore' => false,
        ]);
    }

    public function history(Request $request, int $id): JsonResponse
    {
        $page   = max(1, (int) $request->get('page', 1));
        $result = $this->service->history($id, $page);

        return response()->json($result);
    }

    private function parseExcel(\Illuminate\Http\UploadedFile $file): array
    {
        $spreadsheet = IOFactory::load($file->getRealPath());
        $sheet       = $spreadsheet->getActiveSheet();
        $rows        = [];
        $headers     = null;

        foreach ($sheet->getRowIterator() as $row) {
            $cellIterator = $row->getCellIterator();
            $cellIterator->setIterateOnlyExistingCells(false);

            $cells = [];
            foreach ($cellIterator as $cell) {
                $cells[] = trim((string) ($cell->getCalculatedValue() ?? ''));
            }

            if (!$headers) {
                $headers = array_map(
                    fn($h) => str_replace(' ', '_', strtolower(trim($h))),
                    $cells
                );
                continue;
            }

            if (empty(array_filter($cells, fn($v) => $v !== ''))) continue;

            $rows[] = array_combine($headers, array_pad($cells, count($headers), ''));
        }

        return $rows;
    }
}
