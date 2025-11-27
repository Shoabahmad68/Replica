import React, { useState } from "react";
import * as XLSX from "xlsx";

export default function Reports() {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const rowsPerPage = 20;

  const columns = [
    "SrNo",
    "Date",
    "VchNo",
    "PartyName",
    "City",
    "PartyGroup",
    "State",
    "Item",
    "Qty",
    "AltQty",
    "Rate",
    "Units",
    "Amount",
    "Contact",
    "Mobile",
    "Email",
    "Category"
  ];

  // -------- XML PARSER ----------
  const parseXML = (xmlText) => {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");

    const tags = Array.from(xml.documentElement.childNodes).filter(
      (n) => n.nodeType === 1
    );

    let rows = [];
    let current = {};

    tags.forEach((tag) => {
      const tagName = tag.nodeName.trim();
      const value = tag.textContent.trim();

      if (tagName === "IWSPQRSNO") {
        if (Object.keys(current).length > 0) {
          rows.push(current);
        }
        current = { SrNo: value };
      }

      // MAP XML tags → our fixed columns
      if (tagName === "IWSPQRPARTYDATE") current.Date = value;
      if (tagName === "IWSPQRPARTYVCHNO") current.VchNo = value;
      if (tagName === "IWSPQRPARTYNAME") current.PartyName = value;
      if (tagName === "IWSPQRPARTYCITY") current.City = value;
      if (tagName === "IWSPQRPARTYGRP") current.PartyGroup = value;
      if (tagName === "IWSPQRPARTYSTATE") current.State = value;

      if (tagName === "IWSITEMNAME") current.Item = value;
      if (tagName === "IWSITEMQTY") current.Qty = value;
      if (tagName === "IWSITEMALTQTY") current.AltQty = value;
      if (tagName === "IWSITEMRATE") current.Rate = value;
      if (tagName === "IWSITEMRATEUNITS") current.Units = value;

      if (tagName === "IWSPQRPARTYAMOUNT") current.Amount = value;

      if (tagName === "IWSPQRPARTYCONTACTPER") current.Contact = value;
      if (tagName === "IWSPQRPARTYMOBILENO") current.Mobile = value;
      if (tagName === "IWSPQRPARTYEMAILID") current.Email = value;

      if (tagName === "IWSITEMCTG") current.Category = value;
    });

    if (Object.keys(current).length > 0) {
      rows.push(current);
    }

    return rows;
  };

  // -------- EXCEL PARSER ----------
  const parseExcel = async (file) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    return rows;
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "xml") {
      const text = await file.text();
      const rows = parseXML(text);
      setData(rows);
    } else {
      const rows = await parseExcel(file);
      setData(rows);
    }

    setPage(1);
  };

  const paginatedData = data.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  return (
    <div style={{ padding: 20 }}>

      <input type="file" onChange={handleUpload} />

      <h3>Total Rows: {data.length}</h3>

      <table border="1" cellPadding="6" style={{ width: "100%" }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} style={{ background: "#eee" }}>{col}</th>
            ))}
          </tr>
        </thead>

        <tbody>
          {paginatedData.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col}>{row[col] || ""}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div style={{ marginTop: 20 }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Prev
        </button>
        <span style={{ margin: "0 20px" }}>
          Page {page} / {Math.ceil(data.length / rowsPerPage)}
        </span>
        <button
          onClick={() =>
            setPage((p) => Math.min(Math.ceil(data.length / rowsPerPage), p + 1))
          }
        >
          Next
        </button>
      </div>
    </div>
  );
}
