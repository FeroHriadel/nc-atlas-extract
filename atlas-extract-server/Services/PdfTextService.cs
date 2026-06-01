using System.Text;
using App.Dtos;
using App.Interfaces;
using UglyToad.PdfPig;



namespace App.Services;



public class PdfTextService : IPdfTextService
{
    public string[] ExtractRanges(Stream pdfStream, PageRange[] ranges)
    {
        using var ms = new MemoryStream();
        pdfStream.CopyTo(ms);
        ms.Position = 0;

        using var document = PdfDocument.Open(ms);
        return ranges.Select(r => ExtractRange(document, r.StartPage, r.EndPage)).ToArray();
    }

    private static string ExtractRange(PdfDocument document, int startPage, int endPage)
    {
        var sb = new StringBuilder();
        var lastPage = Math.Min(endPage, document.NumberOfPages);

        for (var pageNum = startPage; pageNum <= lastPage; pageNum++)
        {
            var page = document.GetPage(pageNum);
            sb.AppendLine($"--- Page {pageNum} ---");
            sb.AppendLine(string.Join(" ", page.GetWords().Select(w => w.Text)));
        }

        return sb.ToString();
    }
}
