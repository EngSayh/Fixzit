(function(){
  // Tabs
  const tabs = document.querySelectorAll('.tab');
  const panes = {
    catalog: document.getElementById('pane-catalog'),
    vendors: document.getElementById('pane-vendors'),
    rfqs: document.getElementById('pane-rfqs'),
    orders: document.getElementById('pane-orders'),
  };
  tabs.forEach(t=>{
    t.addEventListener('click', ()=>{
      tabs.forEach(x=> x.classList.remove('active'));
      t.classList.add('active');
      const key = t.dataset.tab;
      Object.entries(panes).forEach(([k,el])=> el.classList.toggle('hidden', k!==key));
    });
  });

  // Demo data
  const vendors = [
    {name:'CoolAir Co.', cat:'AC Repair', rating:'4.7', status:'Active'},
    {name:'Spark Electric', cat:'Electrical', rating:'4.4', status:'Active'},
    {name:'AquaFlow', cat:'Plumbing', rating:'4.1', status:'Pending'},
  ];
  const rfqs = [
    {id:'RFQ-1024', title:'Annual AC Maintenance', cat:'AC Repair', due:'2025-10-01', status:'Open'},
    {id:'RFQ-1025', title:'Mall Cleaning Contract', cat:'Cleaning', due:'2025-10-10', status:'Draft'},
  ];
  const orders = [
    {id:'PO-8812', vendor:'CoolAir Co.', total: '24,000', date:'2025-09-12', status:'Issued'},
  ];

  const vBody = document.getElementById('vendors-tbody');
  const rBody = document.getElementById('rfqs-tbody');
  const oBody = document.getElementById('orders-tbody');

  function actBtns(type, id){
    return `
      <div class="flex gap-2">
        <button class="btn-ghost h-9" data-action="view" data-type="${type}" data-id="${id||''}">View</button>
        <button class="btn-ghost h-9" data-action="edit" data-type="${type}" data-id="${id||''}">Edit</button>
        <button class="btn-ghost h-9 text-red-600" data-action="delete" data-type="${type}" data-id="${id||''}">Delete</button>
      </div>`;
  }

  vendors.forEach(v=>{
    vBody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${v.name}</td>
        <td>${v.cat}</td>
        <td>${v.rating}</td>
        <td><span class="badge ${v.status==='Active'?'green':'gray'}">${v.status}</span></td>
        <td>${actBtns('vendor', v.name)}</td>
      </tr>`);
  });

  rfqs.forEach(r=>{
    rBody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${r.id}</td>
        <td>${r.title}</td>
        <td>${r.cat}</td>
        <td>${r.due}</td>
        <td><span class="badge ${r.status==='Open'?'green':'amber'}">${r.status}</span></td>
        <td>${actBtns('rfq', r.id)}</td>
      </tr>`);
  });

  orders.forEach(o=>{
    oBody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${o.id}</td>
        <td>${o.vendor}</td>
        <td>${o.total}</td>
        <td>${o.date}</td>
        <td><span class="badge gray">${o.status}</span></td>
        <td>${actBtns('po', o.id)}</td>
      </tr>`);
  });

  // Primary action buttons (wire basic handlers)
  const toast = (msg)=> alert(msg);
  document.getElementById('btn-add')?.addEventListener('click', ()=> toast('Add: choose Vendor / RFQ / PO'));
  document.getElementById('btn-import')?.addEventListener('click', ()=> toast('Import CSV/XLS coming soon'));
  document.getElementById('btn-export')?.addEventListener('click', ()=> toast('Export CSV/XLS coming soon'));
  document.getElementById('btn-filter')?.addEventListener('click', ()=> toast('Filter panel coming soon'));
})();

