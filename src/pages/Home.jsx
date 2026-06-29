import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="home-wrap">
      <div className="home-card">
        <h1>SynfraCore Radiology</h1>
        <p>AI Voice-to-Report Assistant for Radiologists</p>
        <Link to="/login">
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            Doctor Login
          </button>
        </Link>
        <p style={{ fontSize: 12, marginTop: 18, color: "#aaa" }}>
          AI generates draft reports only. Final approval always remains with the radiologist.
        </p>
      </div>
    </div>
  );
}
