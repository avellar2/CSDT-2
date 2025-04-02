import ItemForm from "@/components/Item/ItemForm";
import React from "react";

const ItemsPage: React.FC = () => {
    return (
        <div className="flex justify-center items-center p-4 flex-col w-full ">
            <ItemForm />
        </div>
    );
}

export default ItemsPage;