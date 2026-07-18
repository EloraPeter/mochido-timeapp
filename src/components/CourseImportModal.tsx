'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  ClipboardPaste,
  Download,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useCourseService } from '@/hooks/useCourseService';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { parseMochidoXml, MOCHIDO_XML_TEMPLATE, type ParsedCourse, type ImportIssue } from '@/lib/import/mochidoXmlImport';

interface CourseImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

type Tab = 'upload' | 'paste';

export default function CourseImportModal({ isOpen, onClose, onImported }: CourseImportModalProps) {
  const { importCourses } = useCourseService();
  const { success, error: alertError, toast } = useCustomAlert();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('upload');
  const [pastedXml, setPastedXml] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedCourses, setParsedCourses] = useState<ParsedCourse[]>([]);
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  const [hasParsed, setHasParsed] = useState(false);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setTab('upload');
    setPastedXml('');
    setFileName(null);
    setParsedCourses([]);
    setIssues([]);
    setHasParsed(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const runParse = (xmlString: string) => {
    const result = parseMochidoXml(xmlString);
    setParsedCourses(result.courses);
    setIssues(result.issues);
    setHasParsed(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    runParse(text);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([MOCHIDO_XML_TEMPLATE], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mochido-course-template.xml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (parsedCourses.length === 0) return;
    setImporting(true);
    try {
      const summary = await importCourses(parsedCourses);
      if (summary.imported.length > 0) {
        success(
          `Imported ${summary.imported.length} course${summary.imported.length !== 1 ? 's' : ''}` +
          (summary.skipped.length > 0 ? `, skipped ${summary.skipped.length}` : '')
        );
      } else {
        toast('No new courses were imported - all codes already existed.');
      }
      onImported();
      handleClose();
    } catch (err) {
      alertError((err as Error).message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedCourses.length;
  const issueCount = issues.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-end justify-center z-50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Courses</h2>
                <p className="text-xs text-gray-500 mt-0.5">From an XML file or pasted XML</p>
              </div>
              <button onClick={handleClose} className="p-2 -mr-2 active:bg-gray-100 dark:active:bg-gray-700 rounded-full">
                <X size={22} className="text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Tabs */}
              <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-gray-900 rounded-xl p-1">
                <button
                  onClick={() => { setTab('upload'); }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === 'upload' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'
                  }`}
                >
                  <Upload size={14} /> Upload File
                </button>
                <button
                  onClick={() => { setTab('paste'); }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    tab === 'paste' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500'
                  }`}
                >
                  <ClipboardPaste size={14} /> Paste XML
                </button>
              </div>

              {tab === 'upload' ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
                >
                  <FileCode2 size={28} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {fileName ? fileName : 'Tap to choose an .xml file'}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xml,text/xml,application/xml"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={pastedXml}
                    onChange={(e) => setPastedXml(e.target.value)}
                    rows={8}
                    placeholder="Paste your <mochido>...</mochido> XML here"
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-mono"
                  />
                  <button
                    onClick={() => runParse(pastedXml)}
                    disabled={!pastedXml.trim()}
                    className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium disabled:opacity-40"
                  >
                    Preview
                  </button>
                </div>
              )}

              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 text-xs text-blue-500 font-medium"
              >
                <Download size={13} /> Download the Mochido import template
              </button>

              <p className="text-xs text-gray-400 leading-relaxed">
                Required per course: <span className="font-mono">code, title, units, level, semester</span>. Everything else -
                description, department, faculty, lecturer, materials - is optional.
              </p>

              {/* Preview */}
              {hasParsed && (
                <div className="space-y-3 pt-1">
                  {validCount > 0 && (
                    <div className="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
                      <div className="px-3 py-2 bg-green-50 dark:bg-green-900/20 flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                        <CheckCircle2 size={15} />
                        {validCount} course{validCount !== 1 ? 's' : ''} ready to import
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-40 overflow-y-auto">
                        {parsedCourses.map((c, i) => (
                          <div key={i} className="px-3 py-2 flex items-center justify-between text-sm">
                            <div>
                              <span className="font-medium text-gray-900 dark:text-white">{c.title}</span>{' '}
                              <span className="text-xs text-gray-500 font-mono">{c.code}</span>
                            </div>
                            <span className="text-xs text-gray-500">{c.units}u · {c.level}L · {c.semester}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {issueCount > 0 && (
                    <div className="border border-amber-200 dark:border-amber-800 rounded-xl overflow-hidden">
                      <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                        <AlertTriangle size={15} />
                        {issueCount} issue{issueCount !== 1 ? 's' : ''}
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-32 overflow-y-auto">
                        {issues.map((iss, i) => (
                          <p key={i} className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">{iss.message}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-5 pt-3 border-t border-gray-100 dark:border-gray-700 shrink-0">
              <button
                onClick={handleImport}
                disabled={validCount === 0 || importing}
                className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium shadow-md active:bg-blue-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Importing...
                  </>
                ) : (
                  `Import ${validCount > 0 ? validCount : ''} Course${validCount !== 1 ? 's' : ''}`
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
