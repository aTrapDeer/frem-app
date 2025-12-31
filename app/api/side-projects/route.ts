import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getSideProjects, createSideProject } from '@/lib/database'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sideProjects = await getSideProjects(session.user.id)
    return NextResponse.json(sideProjects)
  } catch (error) {
    console.error('Error fetching side projects:', error)
    return NextResponse.json({ error: 'Failed to fetch side projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const sideProject = await createSideProject({
      ...body,
      user_id: session.user.id
    })

    return NextResponse.json(sideProject)
  } catch (error) {
    console.error('Error creating side project:', error)
    return NextResponse.json({ error: 'Failed to create side project' }, { status: 500 })
  }
}

