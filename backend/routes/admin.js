const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const DATA = path.join(__dirname,'..','data','users.json');
const IMPORTS = path.join(__dirname,'..','data','imports');
const router = express.Router();

// list pending users
router.get('/pending-users', async (req,res)=>{
  const users = await fs.readJson(DATA);
  res.json(users.filter(u=>u.status==='pending'));
});

// approve user
router.post('/approve/:id', async (req,res)=>{
  const users = await fs.readJson(DATA);
  const id = req.params.id;
  const u = users.find(x=>x.id===id);
  if(!u) return res.status(404).json({msg:'not found'});
  u.status='active';
  await fs.writeJson(DATA, users);
  res.json({msg:'approved', user:u});
});

// list imports
router.get('/imports', async (req,res)=>{
  const files = await fs.readdir(IMPORTS);
  const list = files.map(f=> ({file:f, url:`/data/imports/${f}`}));
  res.json(list);
});

// clear import (admin clears file)
router.delete('/imports/:name', async (req,res)=>{
  const fname = req.params.name;
  const fp = path.join(IMPORTS,fname);
  if(await fs.pathExists(fp)){
    await fs.remove(fp);
    return res.json({msg:'deleted'});
  } else return res.status(404).json({msg:'not found'});
});

module.exports = router;
