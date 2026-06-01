import DeviceList from "@/components/DeviceList";
import ProtectedRoute from "@/components/ProtectedRoute";

const DeviceListPage: React.FC = () => {
  return (
    <>
      <div className="container">
        <DeviceList />
      </div>
    </>
  )

};

export const getServerSideProps = async () => ({ props: {} });


export default function ProtectedDeviceListPage() {
  return <ProtectedRoute><DeviceListPage /></ProtectedRoute>;
}