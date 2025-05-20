import { Home, PowerIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useHeaderContext } from "../context/HeaderContext";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { useRouter } from "next/router";
import { ChartBar, ClipboardText, File, FileText, GraduationCap, House, List, PlusCircle, Printer } from "phosphor-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";


export const Header: React.FC = () => {
  const { userName, handleLogout } = useHeaderContext();
  const [localUserName, setLocalUserName] = useState(userName);
  const router = useRouter();

  useEffect(() => {
    setLocalUserName(userName);
  }, [userName]);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  const handleSupabaseLogout = async () => {
    await supabase.auth.signOut();
    handleLogout();
    router.push('/login');
  };

  return (
    <div className="w-full flex justify-between items-center pt-8 px-4 sm:px-6 lg:px-8 lg:mb-16 mb-10">
      <Link href="/dashboard" className="">
        <img
          src="images/logo.png"
          alt="Logo"
          className="block h-20 w-20 xl:h-28 xl:w-28 object-cover cursor-pointer"
        />
      </Link>
      <div className="text-center sm:text-left w-full lg:text-center sm:flex lg:flex justify-center items-center gap-1.5 lg:mr-10 mr-6">
        <p className="text-lg sm:text-xl lg:text-2xl">Bem vindo,</p>
        <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{localUserName}</p>
      </div>
      <div>
        <Sheet>
          <SheetTrigger><List className="h-10 w-10 xl:w-16 xl:h-16" /></SheetTrigger>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between gap-2 mb-10">
                <Avatar className="w-20 h-20">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  onClick={handleSupabaseLogout}
                  className="bg-zinc-800 w-16 h-12 hover:bg-red-400 text-white rounded-lg shadow-lg transform transition-transform hover:scale-105"
                >
                  <PowerIcon size={20} />
                </Button>
              </SheetTitle>
              <SheetTitle className="text-2xl">Barra de tarefas</SheetTitle>
              <SheetDescription className="flex flex-col gap-4">
                <div
                  onClick={() => handleNavigate("/dashboard")}
                  className="cursor-pointer bg-zinc-500 hover:bg-zinc-700 text-white p-1 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
                >
                  <House size={48} />
                  <p className="mt-2 text-lg">Home</p>
                </div>
                <div
                  onClick={() => handleNavigate("/items")}
                  className="cursor-pointer bg-blue-400 hover:bg-blue-700 text-white p-1 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
                >
                  <PlusCircle size={48} />
                  <p className="mt-2 text-lg">Cadastrar Itens</p>
                </div>
                <div
                  onClick={() => handleNavigate("/device-list")}
                  className="cursor-pointer bg-green-400 hover:bg-green-700 text-white p-1 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
                >
                  <List size={48} />
                  <p className="mt-2 text-lg">Ver Itens Cadastrados</p>
                </div>
                <div
                  onClick={() => handleNavigate("/fill-pdf-form")}
                  className="cursor-pointer bg-red-400 hover:bg-red-700 text-white p-1 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
                >
                  <FileText size={48} />
                  <p className="mt-2 text-lg">Preencher OS</p>
                </div>
                <div
                  onClick={() => handleNavigate("/statistics")}
                  className="cursor-pointer bg-purple-400 hover:bg-purple-700 text-white p-1 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
                >
                  <ChartBar size={48} />
                  <p className="mt-2 text-lg">Estatísticas de OS</p>
                </div>
                <div
                  onClick={() => handleNavigate("/schools")}
                  className="cursor-pointer bg-orange-400 hover:bg-pink-700 text-white p-1 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
                >
                  <GraduationCap size={48} />
                  <p className="mt-2 text-lg">Todas as Escolas</p>
                </div>
                <div
                  onClick={() => handleNavigate("/os-list")}
                  className="cursor-pointer bg-indigo-400 hover:bg-indigo-700 text-white p-1 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
                >
                  <ClipboardText size={48} />
                  <p className="mt-2 text-lg">OS assinadas ou pendentes</p>
                </div>
                <div
                  onClick={() => handleNavigate("/printers")}
                  className="cursor-pointer bg-teal-400 hover:bg-teal-700 text-white p-1 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
                >
                  <Printer size={48} />
                  <p className="mt-2 text-lg">Impressoras da SME</p>
                </div>
                <div
                  onClick={() => handleNavigate("/memorandums")}
                  className="cursor-pointer bg-yellow-400 hover:bg-yellow-700 text-white p-1 rounded-lg shadow-lg transform transition-transform hover:scale-105 flex flex-col items-center"
                >
                  <File size={48} />
                  <p className="mt-2 text-lg">Todos os memorandos</p>
                </div>
              </SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};