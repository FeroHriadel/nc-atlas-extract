using App.Dtos;

namespace App.Interfaces;



public interface IPdfTextService
{
    string[] ExtractRanges(Stream pdfStream, PageRange[] ranges);
}
