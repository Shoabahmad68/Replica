import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const sample = [
  {name:'Zebronics', value:3209939},
  {name:'Milton', value:442262},
  {name:'Samsung', value:11461204},
  {name:'SKY LED', value:1266818}
];

export default function CompanyChart(){
  return (
    <div style={{width:'100%', height:220}}>
      <ResponsiveContainer>
        <BarChart data={sample}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#0ea5a4" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
