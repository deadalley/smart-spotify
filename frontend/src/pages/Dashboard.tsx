import { Music, Search } from "lucide-react";
import { Link } from "react-router-dom";

export function Dashboard() {
  const quickActions = [
    {
      title: "Playlists",
      to: "/playlists",
      icon: Music,
    },
    {
      title: "Search",
      to: "/search",
      icon: Search,
    },
  ];

  return (
    <div className="container p-6 flex justify-center">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-3/5">
        {quickActions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="bg-zinc-800 p-4 rounded-lg hover:bg-zinc-700 transition-colors duration-200 group"
          >
            <div className="card-body bg-linear-to-br  text-white rounded-box">
              <div className="flex items-center gap-3">
                <action.icon size={24} />
                <h3 className="card-title text-white">{action.title}</h3>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
