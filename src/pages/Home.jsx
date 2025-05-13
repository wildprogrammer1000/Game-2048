import { Button } from "@mui/material";
import { Link } from "react-router-dom";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

const Home = () => {
  return (
    <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">2048</h1>
      <Button variant="contained" sx={{ borderRadius: "50%", p: 1 }}>
        <Link to="/play">
          <PlayArrowIcon fontSize="large" />
        </Link>
      </Button>
    </div>
  );
};

export default Home;
