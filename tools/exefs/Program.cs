using System;
using System.IO;
using LibHac;
using LibHac.Common;
using LibHac.Common.Keys;
using LibHac.Fs;
using LibHac.Fs.Fsa;
using LibHac.Spl;
using LibHac.FsSystem;
using LibHac.Tools.Fs;
using LibHac.Tools.FsSystem;
using LibHac.Tools.FsSystem.NcaUtils;
using LibHac.Tools.Es;

// args: <nsp> <prodkeys> <titlekeys> <outdir>
if (args.Length < 4)
{
    Console.Error.WriteLine("usage: exefsx <nsp> <prod.keys> <title.keys> <outdir>");
    return 2;
}
string nsp = args[0], prod = args[1], title = args[2], outdir = args[3];

var keySet = new KeySet();
ExternalKeyReader.ReadKeyFile(keySet, prod, title, null, null);

using var nspStorage = new LocalStorage(nsp, FileAccess.Read);
var pfs = new PartitionFileSystem();
pfs.Initialize(nspStorage).ThrowIfFailure();

// eShop NSP는 타이틀 키를 내부 .tik(티켓)에 담는다 — 외부 title.keys에 없으므로 여기서 임포트.
foreach (DirectoryEntryEx tik in pfs.EnumerateEntries("*.tik", SearchOptions.RecurseSubdirectories))
{
    using var tikFile = new UniqueRef<IFile>();
    pfs.OpenFile(ref tikFile.Ref, tik.FullPath.ToU8Span(), OpenMode.Read).ThrowIfFailure();
    tikFile.Get.GetSize(out long tsize).ThrowIfFailure();
    var tbuf = new byte[tsize];
    tikFile.Get.Read(out _, 0, tbuf, ReadOption.None).ThrowIfFailure();
    var ticket = new Ticket(new BinaryReader(new MemoryStream(tbuf)));
    byte[] titleKey = ticket.GetTitleKey(keySet);
    var rightsId = new RightsId(ticket.RightsId);
    var accessKey = new AccessKey(titleKey);
    keySet.ExternalKeySet.Add(rightsId, accessKey).ThrowIfFailure();
    Console.WriteLine($"imported ticket key for {Convert.ToHexString(ticket.RightsId)}");
}

foreach (DirectoryEntryEx entry in pfs.EnumerateEntries("*.nca", SearchOptions.RecurseSubdirectories))
{
    using var ncaFile = new UniqueRef<IFile>();
    pfs.OpenFile(ref ncaFile.Ref, entry.FullPath.ToU8Span(), OpenMode.Read).ThrowIfFailure();

    Nca nca;
    try { nca = new Nca(keySet, ncaFile.Get.AsStorage()); }
    catch { continue; }

    if (nca.Header.ContentType != NcaContentType.Program) continue;
    if (!nca.SectionExists(NcaSectionType.Code)) continue;

    Console.WriteLine($"Program NCA: {entry.Name}");
    IFileSystem codeFs = nca.OpenFileSystem(NcaSectionType.Code, IntegrityCheckLevel.ErrorOnInvalid);
    Directory.CreateDirectory(outdir);

    foreach (DirectoryEntryEx f in codeFs.EnumerateEntries("*", SearchOptions.RecurseSubdirectories))
    {
        if (f.Type != DirectoryEntryType.File) continue;

        using var srcRef = new UniqueRef<IFile>();
        codeFs.OpenFile(ref srcRef.Ref, f.FullPath.ToU8Span(), OpenMode.Read).ThrowIfFailure();
        srcRef.Get.GetSize(out long size).ThrowIfFailure();

        var buf = new byte[size];
        srcRef.Get.Read(out long bytesRead, 0, buf, ReadOption.None).ThrowIfFailure();

        string name = f.Name.TrimStart('/');
        string dest = System.IO.Path.Combine(outdir, name);
        File.WriteAllBytes(dest, buf);
        Console.WriteLine($"  wrote {name} ({size} bytes)");
    }
    return 0;
}

Console.Error.WriteLine("No program NCA with code section found");
return 1;
