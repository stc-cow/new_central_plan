export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-muted-foreground">
          This page is ready to be filled. Tell me what to add and I’ll build
          it.
        </p>
      </div>
    </div>
  );
}
