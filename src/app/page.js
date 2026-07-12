import MascotScrollytelling from '../components/MascotScrollytelling';
import ClearSessionOnMount from '../components/ClearSessionOnMount';

export default async function Home() {
  return (
    <div style={{ backgroundColor: '#e5e5e5', minHeight: '100vh' }}>
      <ClearSessionOnMount />
      <MascotScrollytelling user={null} />
    </div>
  );
}
