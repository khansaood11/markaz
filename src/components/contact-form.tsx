'use client';

import { useForm, ValidationError } from '@formspree/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export default function ContactForm() {
  const [state, handleSubmit] = useForm("mwpnyzbl");

  if (state.succeeded) {
    return (
        <div className="flex flex-col items-center justify-center text-center bg-secondary p-8 rounded-lg">
            <h3 className='text-2xl font-bold font-headline text-primary'>Thank you!</h3>
            <p className='text-muted-foreground mt-2'>Your message has been sent successfully. We'll get back to you soon.</p>
        </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prayer Request</CardTitle>
        <CardDescription>
          Submit your prayer request and our community will pray for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Your Name</Label>
            <Input
              id="name"
              type="text"
              name="name"
              placeholder="Enter your name"
              required
            />
            <ValidationError prefix="Name" field="name" errors={state.errors} className="text-sm text-destructive" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="request">Your Prayer Request</Label>
            <Textarea
              id="request"
              name="request"
              rows={5}
              placeholder="Share your prayer request here..."
              required
            />
            <ValidationError prefix="Request" field="request" errors={state.errors} className="text-sm text-destructive" />
          </div>

          <Button type="submit" disabled={state.submitting} className="w-full">
            {state.submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
