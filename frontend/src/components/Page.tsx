import { ArrowLeft } from "lucide-react";
import { PropsWithChildren, ReactNode } from "react";
import { Link, To } from "react-router-dom";

export function Page({ children }: PropsWithChildren) {
  return <div className="p-6 w-full">{children}</div>;
}

function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        {action}
      </div>
      {subtitle && <span className="text-zinc-400">{subtitle}</span>}
    </div>
  );
}

function PageBackButton({ to, label }: { to: To; label: ReactNode }) {
  return (
    <div className="mb-6">
      <Link to={to} className="btn btn-ghost btn-sm">
        <ArrowLeft className="size-4 mr-2" />
        {label}
      </Link>
    </div>
  );
}

Page.Back = PageBackButton;
Page.Header = PageHeader;
