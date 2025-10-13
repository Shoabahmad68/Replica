import React, {useState} from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';

export default function ImportPage(){
  const [info,setInfo] = useState(null);
  const onDrop = async (files) => {
    const file = files[0];
    const fd = new FormData();
    fd.append('file', file);
    const r = await axios.post('http://localhost:4000/api/import/upload', fd, { headers: {'Content-Type':'multipart/form-data'} });
    setInfo(r.data);
  };
  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop});
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Import Report (Excel/CSV/PDF/Images)</h2>
      <div {...getRootProps()} className="p-8 border-2 border-dashed rounded text-center bg-white card-gradient">
        <input {...getInputProps()} />
        { isDragActive ? <p>Drop the file...</p> : <p>Drag 'n' drop file here, or click to select</p> }
        <p className="text-sm mt-2">Note: Excel parsing will start from 2nd row. First row treated as header.</p>
      </div>

      {info && (
        <div className="mt-4 p-4 bg-white shadow rounded">
          <div className="font-medium">Upload Result</div>
          <pre className="text-sm">{JSON.stringify(info,null,2)}</pre>
          <div className="mt-2">
            <a className="text-indigo-600" href={`http://localhost:4000/data/imports/${info.file}`} target="_blank">View parsed JSON</a>
          </div>
        </div>
      )}
    </div>
  )
}
