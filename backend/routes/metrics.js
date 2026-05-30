import express from "express";
import { tsClient} from "../server";

const router=express.router();

router.get("/report/:submission_id",async (req,res)=>{
    try{
        const query=`
    select submission_id, max(tps) as peak_tps,
    round(avg(p50_lat)::numeric,2) as avg_p50_latency,
    round(avg(p99_lat)::numeric,2) as avg_p99_latency,
    round(avg(accuracy)::numeric,2) as final_accuracy,
    round((max(tps)*(avg(accuracy)/100.0))-(avg(p99_lat)*10)::numeric,0) as composite_score,
    from metrics_trading_engine where submission_id=$1 group by submission_id;
    `; 
    const result=await tsClient.query(query,[req.params.submission_id]);
    if(result.rows.length==0){
        return res.status(404).json({
            "message":"No data found"
        })
    }
    return res.status(200).json({
        "data":result.rows[0]
    })
    }catch(err){
        console.log(err);
        return res.status(500).json({
            "message":"database error"
        })
    }
});

router.get("/leaderboard",async (req,res)=>{
    try{
         const query=`
    select
    s.team_id,
    m.submission_id,
    max(m.tps) as peak_tps,
    round(avg(m.p50_lat)::numeric,2) as avg_p50_latency,
    round(avg(m.p99_lat)::numeric,2) as avg_p99_latency,
    round(avg(m.accuracy)::numeric,2) as final_accuracy,
    round((max(m.tps)*(avg(m.accuracy)/100.0))-(avg(m.p99_lat)*10)::numeric,0) as composite_score
    from metrics_trading_engine m
    join submissions s on m.submission_d=s.submission_id
    where m.recorded_at>=Now()-interval '24 hours'
    group by m.submission_id,s.team_id
    order by composite_score desc;
    `;
    const result=await tsClient.query(query);
    return res.status(200).json({
        "data":result.rows
    })
    }catch(err){
        return res.status(500).json({
            "message":"database error"
        })
    }
});

export default router;