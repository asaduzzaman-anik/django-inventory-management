import csv
from io import BytesIO, StringIO

from django.http import HttpResponse
from openpyxl import Workbook


def export_rows(name, columns, rows, export_format):
    headers = [label for _key, label in columns]
    values = [[row.get(key, "") for key, _label in columns] for row in rows]
    if export_format == "csv":
        return _csv(name, headers, values)
    return _xlsx(name, headers, values)


def _csv(name, headers, values):
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    writer.writerows(values)
    response = HttpResponse(buffer.getvalue(), content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{name}.csv"'
    return response


def _xlsx(name, headers, values):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = name[:31]
    sheet.append(headers)
    for row in values:
        sheet.append(row)
    buffer = BytesIO()
    workbook.save(buffer)
    response = HttpResponse(
        buffer.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{name}.xlsx"'
    return response
