#!/bin/bash

# Fix pattern: (typeof models !== 'undefined' && models.X) || model<IType>('Name', Schema)
find server models modules lib -name "*.ts" -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/.archive*/*" -print0 | \
  xargs -0 perl -i -pe 's/\(typeof models !== .undefined. && models\.([A-Za-z0-9_]+)\) \|\| model<([^>]+)>\((.)([A-Za-z0-9_]+)\3,\s*([A-Za-z0-9_]+)\)/getModel<$2>($3$4$3, $5)/g'

# Fix pattern: models.X || model("Name", Schema)  [double quotes, no type]
find server models modules lib -name "*.ts" -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/.archive*/*" -print0 | \
  xargs -0 perl -i -pe 's/models\.([A-Za-z0-9_]+) \|\| model\("([A-Za-z0-9_]+)",\s*([A-Za-z0-9_]+)\)/getModel<any>("$2", $3)/g'

# Fix pattern: models.X || model('Name', Schema)  [single quotes, no type]
find server models modules lib -name "*.ts" -not -path "*/node_modules/*" -not -path "*/.next/*" -not -path "*/.archive*/*" -print0 | \
  xargs -0 perl -i -pe "s/models\.([A-Za-z0-9_]+) \|\| model\('([A-Za-z0-9_]+)',\s*([A-Za-z0-9_]+)\)/getModel<any>('\\2', \\3)/g"

echo "✓ All model patterns fixed"
