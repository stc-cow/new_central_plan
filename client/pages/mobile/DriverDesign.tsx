import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DriverMobilePreview } from "@/components/mobile/DriverMobilePreview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DriverDesignPage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            ACES Fuel Experience Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Compare the administrator web portal alongside the redesigned driver
            mobile journey. Updates here do not affect production until exported
            to their respective platforms.
          </p>
        </header>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Web Portal (reference)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border bg-muted flex items-center justify-center">
                <img
                  src="/placeholder.svg"
                  alt="Web portal preview"
                  className="h-full w-full object-cover rounded-xl"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 hover:opacity-100 transition-opacity">
                  <div className="text-center">
                    <p className="text-sm font-medium">Web portal preview</p>
                    <p className="text-xs">
                      (Live iframe disabled to avoid dev overlay issues)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Driver Mobile App Design</CardTitle>
            </CardHeader>
            <CardContent>
              <DriverMobilePreview />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
