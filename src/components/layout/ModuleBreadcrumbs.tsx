import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import { navItems } from './AppSidebar';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

function findRouteMeta(pathname: string, hash: string) {
  for (const item of navItems) {
    if (item.children) {
      for (const child of item.children) {
        if (child.path.includes('#')) {
          const [base, h] = child.path.split('#');
          if (pathname === base && hash === `#${h}`) {
            return { module: item.label, subModule: child.label, path: child.path };
          }
        } else if (pathname === child.path) {
          return { module: item.label, subModule: child.label, path: child.path };
        }
      }
      // Fallback: if on a hash-based parent page but no hash match, show module only
      if (item.children.some(c => {
        if (c.path.includes('#')) return pathname === c.path.split('#')[0];
        return false;
      })) {
        return { module: item.label, subModule: null, path: null };
      }
    } else if (pathname === item.path) {
      return { module: item.label, subModule: null, path: item.path };
    }
  }
  return null;
}

export default function ModuleBreadcrumbs() {
  const location = useLocation();
  const meta = findRouteMeta(location.pathname, location.hash);

  if (!meta) return null;
  if (meta.module === 'Dashboard' && !meta.subModule) return null;

  return (
    <div className="px-6 pt-4 pb-0 no-print">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/dashboard" className="flex items-center gap-1">
                <Home size={14} />
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            {meta.subModule ? (
              <BreadcrumbLink asChild>
                <Link to={meta.path ?? '/dashboard'}>{meta.module}</Link>
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>{meta.module}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
          {meta.subModule && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{meta.subModule}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
