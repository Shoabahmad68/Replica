import React from 'react';

export default function CardGallery(){
  // placeholder cards; in real app load from API
  const cards = [
    {title:'Company A', img:'/logo.png', subtitle:'Brand'},
    {title:'Product X', img:'/logo.png', subtitle:'Electronics'},
    {title:'Partner Y', img:'/logo.png', subtitle:'Partner'}
  ];
  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map((c,i)=>(
        <div key={i} className="p-3 rounded shadow card-gradient">
          <img src={c.img} alt="" className="h-24 w-full object-cover rounded" />
          <div className="mt-2 font-bold">{c.title}</div>
          <div className="text-sm text-gray-600">{c.subtitle}</div>
        </div>
      ))}
    </div>
  )
}
