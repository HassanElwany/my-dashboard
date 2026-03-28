export default function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center mb-6 mt-12">
      <div className="w-[3px] h-[20px] bg-[#7C3AED] mr-3 rounded-full"></div>
      <h2 className="text-[16px] font-bold uppercase text-[#FFFFFF] tracking-wide">{title}</h2>
    </div>
  );
}