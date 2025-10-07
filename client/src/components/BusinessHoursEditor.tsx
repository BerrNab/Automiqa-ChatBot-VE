import { useFieldArray } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
] as const;

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time (MST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
];

interface BusinessHoursEditorProps {
  control: any;
  name: string;
}

export default function BusinessHoursEditor({ control, name }: BusinessHoursEditorProps) {
  const capitalizeFirst = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div className="space-y-4">
      <FormField
        control={control}
        name={`${name}.timezone`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Timezone</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid="select-timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`${name}.offlineMessage`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Offline Message</FormLabel>
            <FormControl>
              <Input 
                {...field} 
                placeholder="We're currently closed. Please leave a message."
                data-testid="input-offline-message"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-2">
        <Label>Weekly Schedule</Label>
        <div className="space-y-3">
          {DAYS_OF_WEEK.map((day) => (
            <Card key={day} className="p-3">
              <div className="flex items-center gap-4">
                <div className="w-24 font-medium">
                  {capitalizeFirst(day)}
                </div>
                
                <FormField
                  control={control}
                  name={`${name}.schedule.${day}.closed`}
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid={`checkbox-closed-${day}`}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal !mt-0">
                        Closed
                      </FormLabel>
                    </FormItem>
                  )}
                />

                {!control._formValues?.[name.split('.')[1]]?.schedule?.[day]?.closed && (
                  <>
                    <FormField
                      control={control}
                      name={`${name}.schedule.${day}.open`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <div className="flex items-center gap-2">
                            <FormLabel className="text-sm">Open:</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="time"
                                className="w-32"
                                data-testid={`input-open-${day}`}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name={`${name}.schedule.${day}.close`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <div className="flex items-center gap-2">
                            <FormLabel className="text-sm">Close:</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="time"
                                className="w-32"
                                data-testid={`input-close-${day}`}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}