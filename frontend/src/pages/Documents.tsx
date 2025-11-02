import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuthGuard } from "@/components/AuthGuard";
import { toast } from "sonner";
import { FileText, Download, Trash2, Save, Upload } from "lucide-react";
import { DocumentUpload } from "@/components/DocumentUpload";

export const Documents = () => {
  const [documents, setDocuments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_RAG_BACKEND_URL}/list_documents`);
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setDocuments(result.documents);
    } catch (error) {
      console.error("Fetch documents error:", error);
      toast.error("Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (filename: string) => {
    window.open(`${import.meta.env.VITE_RAG_BACKEND_URL}/download/${filename}`, '_blank');
  };

  const handleDelete = async (filename: string) => {
    setDeleting(filename);
    try {
      const response = await fetch(`${import.meta.env.VITE_RAG_BACKEND_URL}/delete_document?filename=${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setDocuments(prev => prev.filter(doc => doc !== filename));
    } catch (error) {
      console.error("Delete document error:", error);
      toast.error("Failed to delete document");
    } finally {
      setDeleting(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_RAG_BACKEND_URL}/rebuild_index`, {
        method: "POST",
      });
      const result = await response.json();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
    } catch (error) {
      console.error("Rebuild index error:", error);
      toast.error("Failed to rebuild index");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background p-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Documents</h1>
            <div className="text-center">Loading documents...</div>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Documents</h1>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Save className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>

          <Card className="p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload New Document
            </h2>
            <DocumentUpload onUploadSuccess={fetchDocuments} />
          </Card>

          {documents.length === 0 ? (
            <Card className="p-6 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No documents uploaded yet.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <Card key={doc} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-500" />
                      <span className="font-medium">{doc}</span>
                      <Badge variant="outline">PDF</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(doc)}
                        disabled={deleting === doc}
                      >
                        {deleting === doc ? (
                          <Trash2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
};
