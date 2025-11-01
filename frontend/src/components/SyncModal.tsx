import { RefreshCw, Trash } from "lucide-react";

export function SyncModal() {
  return (
    <>
      <dialog id="syncModal" className="modal">
        <div className="modal-box">
          <h3 className="text-lg font-bold">Sync Spotify data</h3>
          <p className="py-4 text-sm text-base-content/70">
            For Smart Spotify to work, it has to store your Spotify data
            temporarily for faster access. By clicking the "Sync" button, Smart
            Spotify will load the relevant data from your library.
            <br />
            <br />
            This process does not alter any data on your Spotify account.
            <br />
            <br />
            This data is deleted periodically, upon logout, or at your request.
          </p>
          <div className="modal-action">
            <form method="dialog">
              <button className="btn">Close</button>
            </form>
            <button className="btn btn-error">
              <Trash size={14} />
              Delete data
            </button>
            <button className="btn btn-primary">
              <RefreshCw size={14} />
              Sync
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
      <button
        className="btn btn-primary btn-sm"
        // @ts-expect-error daisyUI adds this
        onClick={() => document.getElementById("syncModal")?.showModal()}
      >
        <RefreshCw size={14} />
        Sync
      </button>
    </>
  );
}
