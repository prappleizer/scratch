import React, { useState } from 'react';

export default function DropdownWrapper({ title, children, defaultOpen = true }) {
  const [collapsed, setCollapsed] = useState(!defaultOpen);

  return (
    <div className={`section${collapsed ? ' collapsed' : ''}`}>
      <h3 onClick={() => setCollapsed(!collapsed)}>{title}</h3>
      <div className="section-content">{children}</div>
    </div>
  );
}