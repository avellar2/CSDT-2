import ItemList from "@/components/Item/ItemList"
import ProtectedRoute from "@/components/ProtectedRoute";

const ItemsListPage: React.FC = () => {
  return (
    <div className="flex justify-center items-center p-4">
      <ItemList />
    </div>
  )
}


export const getServerSideProps = async () => ({ props: {} });


export default function ProtectedItemsListPage() {
  return <ProtectedRoute><ItemsListPage /></ProtectedRoute>;
}