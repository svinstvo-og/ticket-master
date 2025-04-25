import { useState, useRef } from 'react';

interface FileUploadProps {
  value: any[];
  onChange: (files: File[]) => void;
}

export default function FileUpload({ value, onChange }: FileUploadProps) {
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPreviewFiles(files);
    onChange(files);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setPreviewFiles(files);
      onChange(files);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const removeFile = (index: number) => {
    const newFiles = [...previewFiles];
    newFiles.splice(index, 1);
    setPreviewFiles(newFiles);
    onChange(newFiles);
  };
  
  return (
    <div 
      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {previewFiles.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {previewFiles.map((file, index) => (
            <div key={index} className="flex items-center bg-gray-100 rounded p-2 text-sm">
              {file.type.startsWith('image/') ? (
                <img 
                  src={URL.createObjectURL(file)} 
                  alt={file.name} 
                  className="h-8 w-8 object-cover rounded mr-2" 
                />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              )}
              <span className="truncate max-w-[100px]">{file.name}</span>
              <button 
                type="button" 
                onClick={() => removeFile(index)}
                className="ml-2 text-gray-500 hover:text-red-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      
      <label 
        htmlFor="file-upload" 
        className="cursor-pointer flex flex-col items-center justify-center"
        onClick={() => fileInputRef.current?.click()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span className="text-gray-600 font-medium">Klikněte pro nahrání souborů</span>
        <span className="text-xs text-gray-500 mt-1">nebo přetáhněte sem</span>
        <input 
          ref={fileInputRef}
          id="file-upload" 
          name="file-upload" 
          type="file" 
          multiple 
          className="hidden"
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
}
