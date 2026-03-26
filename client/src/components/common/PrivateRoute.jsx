import { Navigate } from 'react-router-dom';
import useAuthStore from '../../stores/useAuthStore';

const PrivateRoute = ({ children }) => {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default PrivateRoute;
